namespace vidosa.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class addIpAddress : DbMigration
    {
        public override void Up()
        {
            AddColumn("dbo.EmailLists", "IpAddress", c => c.String());
        }
        
        public override void Down()
        {
            DropColumn("dbo.EmailLists", "IpAddress");
        }
    }
}
