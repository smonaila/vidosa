namespace vidosa.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class updateEmailListTable : DbMigration
    {
        public override void Up()
        {
            AddColumn("dbo.EmailLists", "Password", c => c.String());
        }
        
        public override void Down()
        {
            DropColumn("dbo.EmailLists", "Password");
        }
    }
}
