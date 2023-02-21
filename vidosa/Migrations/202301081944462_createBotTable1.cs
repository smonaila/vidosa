namespace vidosa.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class createBotTable1 : DbMigration
    {
        public override void Up()
        {
            AddColumn("dbo.Bots", "Username", c => c.String());
        }
        
        public override void Down()
        {
            DropColumn("dbo.Bots", "Username");
        }
    }
}
